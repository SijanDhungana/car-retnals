// Polls for new food orders off the main thread. Browsers throttle timers in
// background tabs on the page itself, but not in a worker, so orders still
// arrive (and get read out) while another tab is in front.
// The page sends the feed URL, e.g. "/api/food/orders?location=pickering&target=upstairs".
let feed = null;
let after = 0;

async function poll() {
  try {
    const response = await fetch(after ? `${feed}&after=${after}` : feed, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const { orders } = await response.json();
    if (orders.length) after = orders[orders.length - 1].id;
    postMessage({ ok: true, orders });
  } catch {
    postMessage({ ok: false });
  } finally {
    setTimeout(poll, 2000);
  }
}

onmessage = (event) => {
  if (feed) return;
  feed = event.data.feed;
  poll();
};
