// Polls for new food orders off the main thread. Browsers throttle timers in
// background tabs on the page itself, but not in a worker, so orders still
// arrive (and get read out) while another tab is in front.
let after = 0;
let started = false;

async function poll() {
  try {
    const query = after ? `?after=${after}` : "";
    const response = await fetch(`/api/food/orders${query}`, { cache: "no-store" });
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

onmessage = () => {
  if (started) return;
  started = true;
  poll();
};
