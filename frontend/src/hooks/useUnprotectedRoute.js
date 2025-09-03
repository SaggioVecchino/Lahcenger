import useProtectedUnprotected from "./useProtectedOrUnprotected";

export default function useUnrotectedRoute() {
  const isProtected = false;
  useProtectedUnprotected(isProtected);
}
