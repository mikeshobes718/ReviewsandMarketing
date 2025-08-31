export default function Pricing() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Pricing</h1>
      <p>Starter plan – $29/mo</p>
      <form action="/api/stripe/checkout" method="POST">
        <button className="mt-4 px-4 py-2 rounded bg-blue-600 text-white" type="submit">Subscribe</button>
      </form>
    </div>
  );
}
