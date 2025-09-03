import useProtectedUnprotected from "./useProtectedOrUnprotected";

export default function useProtectedRoute() {
  const isProtected = true;
  useProtectedUnprotected(isProtected);
}
