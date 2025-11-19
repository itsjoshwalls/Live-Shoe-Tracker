// Client-side Supabase initialization
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from import.meta.env
import { createClient } from '@supabase/supabase-js';

let supabase = null;

function init() {
  if (supabase) return supabase;
  
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  
  if (!url || !key) {
    console.warn("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Supabase will not be initialized.");
    return null;
  }
  
  try {
    supabase = createClient(url, key);
    return supabase;
  } catch (e) {
    console.error("Failed to initialize Supabase:", e);
    return null;
  }
}

// Listen to releases table changes in real-time
function listenReleases(onChange) {
  const client = init();
  if (!client) return () => {};
  
  // Initial fetch
  client
    .from('releases')
    .select('*')
    .order('name')
    .then(({ data, error }) => {
      if (error) {
        console.error("Error fetching releases:", error);
        return;
      }
      onChange(data || []);
    });
  
  // Subscribe to real-time changes
  const subscription = client
    .channel('releases-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'releases' },
      (payload) => {
        // Refetch all data on any change (insert/update/delete)
        client
          .from('releases')
          .select('*')
          .order('name')
          .then(({ data }) => onChange(data || []));
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

// Listen to user's personal shoe collection
function listenCollection(tableName, onChange) {
  const client = init();
  if (!client) return () => {};
  
  // Initial fetch
  client
    .from(tableName)
    .select('*')
    .order('name')
    .then(({ data, error }) => {
      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return;
      }
      onChange(data || []);
    });
  
  // Subscribe to real-time changes
  const subscription = client
    .channel(`${tableName}-channel`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: tableName },
      () => {
        client
          .from(tableName)
          .select('*')
          .order('name')
          .then(({ data }) => onChange(data || []));
      }
    )
    .subscribe();
  
  return () => subscription.unsubscribe();
}

// Update mileage (increment)
async function incrementMileage(tableName, id, by = 1) {
  const client = init();
  if (!client) throw new Error("Supabase not initialized");
  
  // Supabase doesn't have increment(), so we need to read first
  const { data: current, error: fetchError } = await client
    .from(tableName)
    .select('mileage')
    .eq('id', id)
    .single();
  
  if (fetchError) throw fetchError;
  
  const newMileage = (current?.mileage || 0) + by;
  
  const { error } = await client
    .from(tableName)
    .update({ mileage: newMileage })
    .eq('id', id);
  
  if (error) throw error;
}

// Update mileage (set)
async function updateMileage(tableName, id, newMileage) {
  const client = init();
  if (!client) throw new Error("Supabase not initialized");
  
  const { error } = await client
    .from(tableName)
    .update({ mileage: newMileage })
    .eq('id', id);
  
  if (error) throw error;
}

// Add shoe to collection
async function addShoe(tableName, shoe) {
  const client = init();
  if (!client) throw new Error("Supabase not initialized");
  
  const { error } = await client
    .from(tableName)
    .insert([shoe]);
  
  if (error) throw error;
}

// Remove shoe from collection
async function removeShoe(tableName, id) {
  const client = init();
  if (!client) throw new Error("Supabase not initialized");
  
  const { error } = await client
    .from(tableName)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Retire shoe
async function retireShoe(tableName, id) {
  const client = init();
  if (!client) throw new Error("Supabase not initialized");
  
  const { error } = await client
    .from(tableName)
    .update({ retired: true })
    .eq('id', id);
  
  if (error) throw error;
}

// Send chat message
async function sendChatMessage(tableName, msg) {
  const client = init();
  if (!client) throw new Error("Supabase not initialized");
  
  const { error } = await client
    .from(tableName)
    .insert([msg]);
  
  if (error) throw error;
}

// Auth: Sign in with email/password
async function signIn(email, password) {
  const client = init();
  if (!client) throw new Error("Supabase not initialized");
  
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data.user;
}

// Auth: Sign up
async function signUp(email, password) {
  const client = init();
  if (!client) throw new Error("Supabase not initialized");
  
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data.user;
}

// Auth: Sign out
async function signOut() {
  const client = init();
  if (!client) return;
  
  await client.auth.signOut();
}

// Auth: Listen to auth state changes
function onAuthChange(callback) {
  const client = init();
  if (!client) return () => {};
  
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
  
  return () => subscription.unsubscribe();
}

// Check if user is admin (you'll need to set up custom claims or a role column)
async function isUserAdmin(user) {
  if (!user) return false;
  const client = init();
  if (!client) return false;
  
  // Check if user has admin role in a users table
  const { data, error } = await client
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (error) return false;
  return data?.role === 'admin';
}

export {
  init,
  listenReleases,
  listenCollection,
  updateMileage,
  incrementMileage,
  addShoe,
  removeShoe,
  retireShoe,
  sendChatMessage,
  signIn,
  signUp,
  signOut,
  onAuthChange,
  isUserAdmin,
};
