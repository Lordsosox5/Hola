import { useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  OrderService,
  FavoritesService,
  AddressService,
} from '../lib/supabase-service';

export interface SyncUserDataParams {
  user: User | null;
  onOrdersLoaded?: (orders: any[]) => void;
  onFavoriteProductsLoaded?: (productIds: string[]) => void;
  onFavoriteRestaurantsLoaded?: (restaurantNames: string[]) => void;
  onAddressesLoaded?: (addresses: any[]) => void;
  onOrderUpdated?: (order: any) => void;
  onError?: (error: Error) => void;
}

export const useSyncUserData = ({
  user,
  onOrdersLoaded,
  onFavoriteProductsLoaded,
  onFavoriteRestaurantsLoaded,
  onAddressesLoaded,
  onOrderUpdated,
  onError,
}: SyncUserDataParams) => {
  // Sync all user data from Supabase
  const syncData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Load orders
      const orders = await OrderService.getUserOrders(user.id);
      onOrdersLoaded?.(orders);

      // Load favorite products
      const favoriteProductIds = await FavoritesService.getFavoriteProducts(
        user.id
      );
      onFavoriteProductsLoaded?.(favoriteProductIds);

      // Load favorite restaurants
      const favoriteRestaurants =
        await FavoritesService.getFavoriteRestaurants(user.id);
      onFavoriteRestaurantsLoaded?.(favoriteRestaurants);

      // Load addresses
      const addresses = await AddressService.getUserAddresses(user.id);
      onAddressesLoaded?.(addresses);

      console.log('User data synced successfully from Supabase');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Error syncing user data:', err);
      onError?.(err);
    }
  }, [
    user?.id,
    onOrdersLoaded,
    onFavoriteProductsLoaded,
    onFavoriteRestaurantsLoaded,
    onAddressesLoaded,
    onError,
  ]);

  // Trigger sync when user changes
  useEffect(() => {
    if (user?.id) {
      syncData();
    }
    // The parent supplies inline state callbacks. The user ID is the intended
    // synchronization boundary, so callback identity changes must not retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!user?.id) return;

    try {
      const subscription = supabase
        .from('orders')
        .on('*', (payload: any) => {
          // Only update if the order belongs to this user
          if (payload.new?.user_id === user.id) {
            onOrderUpdated?.(payload.new);
            console.log('Order updated in real-time:', payload.new);
          }
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.log('Real-time subscriptions not available, using polling instead');
    }
  }, [user?.id, onOrderUpdated]);

  return { syncData };
};

// Hook to subscribe to order status changes
export const useOrderSubscription = (orderId: string | null) => {
  useEffect(() => {
    if (!orderId) return;

    // In a real implementation, you would set up a Supabase real-time subscription here
    // Example:
    // const subscription = supabase
    //   .from(`orders:order_id=eq.${orderId}`)
    //   .on('*', (payload) => {
    //     console.log('Order updated:', payload);
    //   })
    //   .subscribe();

    // return () => {
    //   subscription.unsubscribe();
    // };
  }, [orderId]);
};
