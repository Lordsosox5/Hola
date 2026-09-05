import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ===== Driver Services =====
export const DriverService = {
  // Create a delivery request for a newly placed order
  async createDelivery(orderId: string) {
    const { data, error } = await supabase
      .from('deliveries')
      .insert({ order_id: orderId, status: 'waiting_driver' })
      .select('*, orders(*)')
      .single();
    if (error) throw error;
    return data;
  },

  // Get driver profile
  async getDriverProfile(driverId: string) {
    const { data, error } = await supabase.rpc('get_driver_profile', { p_driver_id: driverId });
    if (error) {
      console.error('Error getting driver profile:', error);
      throw error;
    }
    return Array.isArray(data) ? data[0] ?? null : data;
  },

  // Update driver profile
  async updateDriverProfile(driverId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('drivers')
      .update(updates)
      .eq('id', driverId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Create driver profile
  async createDriverProfile(userId: string, driverData: Record<string, any>) {
    const { data, error } = await supabase
      .from('drivers')
      .insert([
        {
          id: userId,
          ...driverData,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update driver status (online/offline)
  async updateDriverStatus(driverId: string, status: 'online' | 'offline') {
    return this.updateDriverProfile(driverId, {
      status,
      last_seen: new Date().toISOString(),
    });
  },

  // Update driver location
  async updateDriverLocation(driverId: string, latitude: number, longitude: number) {
    const { data, error } = await supabase
      .from('drivers')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date().toISOString(),
      })
      .eq('id', driverId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get available deliveries
  async getAvailableDeliveries(driverId: string) {
    const { data, error } = await supabase.rpc('get_available_deliveries_for_driver', {
      p_driver_id: driverId,
    });
    if (error) throw error;
    return (data ?? []).map((delivery: any) => ({
      ...delivery,
      orders: delivery.orders ?? null,
    }));
  },

  // Accept delivery
  async acceptDelivery(driverId: string, deliveryId: string) {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          assigned_driver_id: driverId,
          status: 'driver_accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)
        .eq('status', 'waiting_driver')
        .is('assigned_driver_id', null)
        .select('*, orders(*)')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        const fallback = await supabase.rpc('claim_delivery_for_driver', {
          delivery_id: deliveryId,
          driver_id: driverId,
        });

        if (fallback.error) throw fallback.error;
        if (!fallback.data) return null;

        return Array.isArray(fallback.data) ? fallback.data[0] ?? null : fallback.data;
      }

      if (data.order_id) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'driver_accepted', updated_at: new Date().toISOString() })
          .eq('id', data.order_id);

        if (orderError) {
          console.warn('Delivery accepted, but order status sync failed:', orderError);
        }
      }

      return data;
    } catch (error) {
      try {
        const fallback = await supabase.rpc('claim_delivery_for_driver', {
          delivery_id: deliveryId,
          driver_id: driverId,
        });

        if (fallback.error) {
          const message = fallback.error.message || (error instanceof Error ? error.message : 'Unable to accept delivery');
          throw new Error(message);
        }

        if (!fallback.data) return null;
        return Array.isArray(fallback.data) ? fallback.data[0] ?? null : fallback.data;
      } catch (fallbackError) {
        const message = fallbackError instanceof Error
          ? fallbackError.message
          : error instanceof Error
            ? error.message
            : 'Unable to accept delivery';
        throw new Error(message);
      }
    }
  },

  // Update delivery status
  async updateDeliveryStatus(deliveryId: string, status: string) {
    const { data, error } = await supabase.rpc('set_driver_delivery_status', {
      p_delivery_id: deliveryId,
      p_driver_id: (await supabase.auth.getUser()).data.user?.id,
      p_status: status,
    });

    if (error) throw error;
    return data;
  },

  // Get driver earnings
  async getDriverEarnings(driverId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('deliveries')
      .select('*, earnings')
      .eq('assigned_driver_id', driverId)
      .eq('status', 'completed');

    if (startDate) query = query.gte('completed_at', startDate);
    if (endDate) query = query.lte('completed_at', endDate);

    const { data, error } = await query;
    if (error) console.error('Error getting earnings:', error);
    
    if (!data) return { total: 0, deliveries: [] };

    const grossTotal = data.reduce((sum, delivery) => sum + (delivery.earnings || 0), 0);
    const { data: requests } = await supabase
      .from('driver_payout_requests')
      .select('amount')
      .eq('driver_id', driverId)
      .in('status', ['pending', 'paid']);
    const requestedTotal = (requests ?? []).reduce((sum, request) => sum + Number(request.amount || 0), 0);
    return { total: Math.max(0, grossTotal - requestedTotal), deliveries: data };
  },

  // Get driver stats
  async getDriverStats(driverId: string) {
    const { data, error } = await supabase
      .from('deliveries')
      .select('status')
      .eq('assigned_driver_id', driverId);

    if (error) console.error('Error getting driver stats:', error);
    if (!data) return { completed: 0, pending: 0, cancelled: 0 };

    const stats = {
      completed: data.filter((d) => d.status === 'completed').length,
      pending: data.filter((d) => d.status === 'in_progress').length,
      cancelled: data.filter((d) => d.status === 'cancelled').length,
    };

    return stats;
  },

  // Submit delivery proof (photo)
  async submitDeliveryProof(deliveryId: string, proofData: Record<string, any>) {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        proof_photo_url: proofData.photoUrl,
        customer_signature: proofData.signature,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ===== Delivery Services =====
export const DeliveryService = {
  // Get delivery details
  async getDeliveryDetails(deliveryId: string) {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, orders(*), customers(*)')
      .eq('id', deliveryId)
      .single();
    if (error) console.error('Error getting delivery details:', error);
    return data;
  },

  // Get active deliveries for driver
  async getActiveDeliveries(driverId: string) {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('assigned_driver_id', driverId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false });
    if (error) console.error('Error getting active deliveries:', error);
    return data ?? [];
  },

  // Get completed deliveries for driver
  async getCompletedDeliveries(driverId: string, limit = 20) {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('assigned_driver_id', driverId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(limit);
    if (error) console.error('Error getting completed deliveries:', error);
    return data ?? [];
  },
};
