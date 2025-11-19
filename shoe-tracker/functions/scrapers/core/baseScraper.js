// core/baseScraper.js
import { delay } from "./utils.js";
import fetch from "node-fetch";
import * as functions from "firebase-functions";

export async function runScraperModule(retailerId, retries = 3) {
  try {
    const { fetchList, normalize } = await import(`../${retailerId}.js`);
    const rawList = await fetchList();
    const normalized = rawList.map(normalize).filter(Boolean);
    return normalized;
  } catch (err) {
    if (retries > 0) {
      functions.logger.warn(`${retailerId} scrape failed, retrying...`, err.message);
      await delay(3000);
      return runScraperModule(retailerId, retries - 1);
    }
    functions.logger.error(`${retailerId} scraper permanently failed`, err);
    return [];
  }
}
