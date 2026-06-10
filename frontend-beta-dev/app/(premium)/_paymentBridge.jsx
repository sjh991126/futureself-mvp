// Tiny module-level bridge: /payment-method writes the chosen method here,
// request-to-book consumes it on focus. Avoids param-serialization round-trips.
export const paymentSelection = { value: null };
