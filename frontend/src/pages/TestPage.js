import { useAuth } from "../AuthContext";

export default function TestPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1>Test page</h1>
      <div>
        <a href="/dummy">Try dummy link</a>
      </div>

      <div>
        <a href="/">Go to /</a>
      </div>
      <div>
        <a href="/dashboard">Go to dashboard</a>
      </div>
      <div>
        <a href="/signup">Go to signup</a>
      </div>
      <div>
        <a href="/login">Go to login</a>
      </div>
    </div>
  );
}
