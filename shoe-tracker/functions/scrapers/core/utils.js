// core/utils.js
export const delay = ms => new Promise(res => setTimeout(res, ms));

export const safeFetch = async (url, headers = {}) => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Fetch failed: ${url} -> ${res.status}`);
  return res.json();
};
