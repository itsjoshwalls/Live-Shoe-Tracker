import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Retailer } from '../types/retailer';

const AdminPage = () => {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRetailers = async () => {
      const { data, error } = await supabase
        .from('retailers')
        .select('*');

      if (error) {
        console.error('Error fetching retailers:', error);
      } else {
        setRetailers(data);
      }
      setLoading(false);
    };

    fetchRetailers();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('retailers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting retailer:', error);
    } else {
      setRetailers(retailers.filter((retailer) => retailer.id !== id));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>URL</th>
            <th>Tier</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {retailers.map((retailer) => (
            <tr key={retailer.id}>
              <td>{retailer.name}</td>
              <td><a href={retailer.url} target="_blank" rel="noopener noreferrer">{retailer.url}</a></td>
              <td>{retailer.tier}</td>
              <td>
                <button onClick={() => handleDelete(retailer.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPage;