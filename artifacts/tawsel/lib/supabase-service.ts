import { supabase } from './supabase';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// ===== Authentication Services =====
export const AuthService = {
  // Get current session
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error('Error getting session:', error);
    return data?.session ?? null;
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error('Error getting user:', error);
    return data?.session?.user ?? null;
  },

  // Sign up with email and password
  async signUp(email: string, password: string, userData?: Record<string, any>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });
    if (error) throw error;
    return data;
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Update profile metadata for the authenticated user
  async updateUserMetadata(userData: Record<string, any>) {
    const { data, error } = await supabase.auth.updateUser({
      data: userData,
    });
    if (error) throw error;
    return data.user;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      callback(session?.user ?? null);
    });
    return data?.subscription;
  },
};

// ===== User Profile Services =====
export const UserService = {
  // Get user profile
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('Error getting user profile:', error);
    return data;
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Create user profile
  async createUserProfile(userId: string, profileData: Record<string, any>) {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          ...profileData,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ===== Orders Services =====
export const OrderService = {
  // Create a new order
  async createOrder(orderData: Record<string, any>) {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get user orders
  async getUserOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error getting orders:', error);
    return data ?? [];
  },

  // Get order by ID
  async getOrderById(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (error) console.error('Error getting order:', error);
    return data;
  },

  // Load an order with its delivery and assigned driver for tracking
  async getOrderTracking(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, deliveries(*, drivers(*))')
      .eq('order_id', orderId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ===== Favorites Services =====
export const FavoritesService = {
  // Get user favorite products
  async getFavoriteProducts(userId: string) {
    const { data, error } = await supabase
      .from('favorite_products')
      .select('product_id')
      .eq('user_id', userId);
    if (error) console.error('Error getting favorite products:', error);
    return data?.map((item) => item.product_id) ?? [];
  },

  // Add product to favorites
  async addFavoriteProduct(userId: string, productId: string) {
    const { error } = await supabase.from('favorite_products').insert([
      {
        user_id: userId,
        product_id: productId,
      },
    ]);
    if (error) throw error;
  },

  // Remove product from favorites
  async removeFavoriteProduct(userId: string, productId: string) {
    const { error } = await supabase
      .from('favorite_products')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw error;
  },

  // Get user favorite restaurants
  async getFavoriteRestaurants(userId: string) {
    const { data, error } = await supabase
      .from('favorite_restaurants')
      .select('restaurant_id')
      .eq('user_id', userId);
    if (error) console.error('Error getting favorite restaurants:', error);
    return data?.map((item) => item.restaurant_id) ?? [];
  },

  // Add restaurant to favorites
  async addFavoriteRestaurant(userId: string, restaurantId: string) {
    const { error } = await supabase.from('favorite_restaurants').insert([
      {
        user_id: userId,
        restaurant_id: restaurantId,
      },
    ]);
    if (error) throw error;
  },

  // Remove restaurant from favorites
  async removeFavoriteRestaurant(userId: string, restaurantId: string) {
    const { error } = await supabase
      .from('favorite_restaurants')
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);
    if (error) throw error;
  },
};

// ===== Addresses Services =====
export const AddressService = {
  // Get user addresses
  async getUserAddresses(userId: string) {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    if (error) console.error('Error getting addresses:', error);
    return data ?? [];
  },

  // Create new address
  async createAddress(userId: string, addressData: Record<string, any>) {
    const { data, error } = await supabase
      .from('addresses')
      .insert([
        {
          user_id: userId,
          ...addressData,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update address
  async updateAddress(addressId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('addresses')
      .update(updates)
      .eq('id', addressId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete address
  async deleteAddress(addressId: string) {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId);
    if (error) throw error;
  },
};

// ===== Restaurants Services =====
export const RestaurantService = {
  // Get all restaurants
  async getAllRestaurants() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('name');
    if (error) console.error('Error getting restaurants:', error);
    return data ?? [];
  },

  // Get restaurant by ID
  async getRestaurantById(restaurantId: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();
    if (error) console.error('Error getting restaurant:', error);
    return data;
  },

  // Get restaurant menu/products
  async getRestaurantProducts(restaurantId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name');
    if (error) console.error('Error getting restaurant products:', error);
    return data ?? [];
  },
};

// ===== Products Services =====
export const ProductService = {
  // Get all products
  async getAllProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, restaurants(name)')
      .order('name');
    if (error) console.error('Error getting products:', error);
    return data ?? [];
  },

  // Get product by ID
  async getProductById(productId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    if (error) console.error('Error getting product:', error);
    return data;
  },

  // Search products
  async searchProducts(query: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    if (error) console.error('Error searching products:', error);
    return data ?? [];
  },
};

// ===== Categories Services =====
export const CategoryService = {
  // Get all categories
  async getAllCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) console.error('Error getting categories:', error);
    return data ?? [];
  },

  // Get category by ID
  async getCategoryById(categoryId: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();
    if (error) console.error('Error getting category:', error);
    return data;
  },
};
