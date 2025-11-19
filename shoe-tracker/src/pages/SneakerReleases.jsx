import React, { useEffect, useState } from "react";
import {
  listenCollection,
  incrementMileage,
  signInWithGoogle,
  signOut,
  onAuthChange,
  isUserAdmin,
  addShoe,
  removeShoe,
  retireShoe,
  sendChatMessage,
  signInAnon,
} from "../firebase";

// Helper for anonymous color
function getUserColor(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  const color = `hsl(${hash % 360},70%,70%)`;
  return color;
}

const SneakerReleases = () => {
  // Private shoes (per-user)
  const [privateShoes, setPrivateShoes] = useState([]);
  // Public hype releases
  const [hypeReleases, setHypeReleases] = useState([]);
  // Community chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  // Auth
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  // Collection names
  const privateCollection = user ? `/users/${user.uid}/shoes` : null;
  const hypeCollection = "sneakers_hype";
  const chatCollection = "artifacts/live-shoe-tracker/public/data/community_chat";

  // Auth listener
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        const admin = await isUserAdmin(u);
        setIsAdmin(!!admin);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub && unsub();
  }, []);

  // Public collections
  useEffect(() => {
    const unsubHype = listenCollection(hypeCollection, setHypeReleases);
    const unsubChat = listenCollection(chatCollection, setChatMessages);
    return () => {
      unsubHype && unsubHype();
      unsubChat && unsubChat();
    };
  }, []);

  // Private user shoes
  useEffect(() => {
    if (!user || !privateCollection) return;
    const unsubPrivate = listenCollection(privateCollection, setPrivateShoes);
    return () => unsubPrivate && unsubPrivate();
  }, [user, privateCollection]);

  // Example: Add/Remove/Retire handlers for private shoes (stub)
  const handleAddShoe = async () => {
    if (!user) return alert("Sign in required.");
    const name = window.prompt("Enter shoe name:");
    if (!name) return;
    try {
      await addShoe(privateCollection, { name, mileage: 0, retired: false });
    } catch (err) {
      console.error(err);
      alert("Failed to add shoe.");
    }
  };
  const handleRemoveShoe = async (id) => {
    if (!user) return alert("Sign in required.");
    if (!window.confirm("Remove this shoe?")) return;
    try {
      await removeShoe(privateCollection, id);
    } catch (err) {
      console.error(err);
      alert("Failed to remove shoe.");
    }
  };
  const handleRetireShoe = async (id) => {
    if (!user) return alert("Sign in required.");
    if (!window.confirm("Retire this shoe?")) return;
    try {
      await retireShoe(privateCollection, id);
    } catch (err) {
      console.error(err);
      alert("Failed to retire shoe.");
    }
  };
  const handleIncrementMileage = async (id) => {
    if (!user) return alert("Sign in required.");
    try {
      await incrementMileage(privateCollection, id, 1);
    } catch (err) {
      console.error(err);
      alert("Failed to increment mileage.");
    }
  };
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    try {
      await sendChatMessage(chatCollection, {
        text: chatInput,
        uid: user ? user.uid : "anon",
        ts: Date.now(),
      });
      setChatInput("");
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    }
  };
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // fallback to anonymous sign-in
      await signInAnon();
    }
  };
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6">
      {loading && <div className="text-gray-500 mb-4">Loading...</div>}
      <h1 className="text-3xl font-bold mb-6">Live Sneaker Tracker</h1>
      <div className="mb-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span>Signed in {isAdmin ? "(admin)" : ""}</span>
            <button onClick={handleSignOut} className="bg-gray-700 text-white px-3 py-1 rounded">Sign out</button>
          </div>
        ) : (
          <div>
            <button onClick={handleSignIn} className="bg-blue-600 text-white px-3 py-1 rounded">Sign in with Google</button>
            <p className="text-sm text-gray-500">Sign in to enable admin actions (if you have the admin claim).</p>
          </div>
        )}
      </div>

      {/* Private Shoe List */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-2">Your Shoes</h2>
        {user ? (
          <>
            <button onClick={handleAddShoe} className="bg-green-600 text-white px-3 py-1 rounded mb-2">Add Shoe</button>
            {privateShoes.length === 0 ? (
              <p>No shoes found. Add your first pair!</p>
            ) : (
              <ul className="space-y-4">
                {privateShoes.map((shoe) => (
                  <li key={shoe.id} className="border rounded p-3 flex justify-between items-center">
                    <div>
                      <strong>{shoe.name || "Unnamed"}</strong>
                      <div>Mileage: {shoe.mileage ?? 0}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleIncrementMileage(shoe.id)} className="bg-blue-500 text-white px-2 py-1 rounded">+ Mileage</button>
                      <button onClick={() => handleRetireShoe(shoe.id)} className="bg-yellow-500 text-white px-2 py-1 rounded">Retire</button>
                      <button onClick={() => handleRemoveShoe(shoe.id)} className="bg-red-500 text-white px-2 py-1 rounded">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>Sign in to track your shoes.</p>
        )}
      </section>

      {/* Live Hype Release Card */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-2">Live Hype Releases</h2>
        {hypeReleases.length === 0 ? (
          <p>No hype releases found.</p>
        ) : (
          <ul className="space-y-4">
            {hypeReleases.map((release) => (
              <li key={release.id} className="border rounded p-3">
                <div className="font-semibold">{release.name}</div>
                <div>Brand: {release.brand}</div>
                <div>Drop Date: {release.drop_date}</div>
                {release.drop_time && <div>Drop Time: {release.drop_time}</div>}
                <div>Hype Score: {release.hype_score}</div>
                {release.link_uri && (
                  <a href={release.link_uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Source</a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Community Chat */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-2">Community Chat</h2>
        <div className="border rounded p-3 mb-2" style={{ maxHeight: 200, overflowY: "auto" }}>
          {chatMessages.length === 0 ? (
            <p>No messages yet.</p>
          ) : (
            <ul>
              {chatMessages.map((msg) => (
                <li key={msg.id} style={{ color: getUserColor(msg.uid || "") }}>
                  <span className="font-mono">{(msg.uid || "anon").slice(0, 6)}:</span> {msg.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="border px-2 py-1 rounded flex-1"
              placeholder="Type your message..."
            />
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Send</button>
          </form>
        ) : (
          <p>Sign in to join the chat.</p>
        )}
      </section>
    </div>
  );
};

export default SneakerReleases;
