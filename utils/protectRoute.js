import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function protectRoute(Component, allowedRoles) {
  return function ProtectedPage(props) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
      getSession().then((session) => {
        if (!session) {
          router.replace("/login");
        } else if (!allowedRoles.includes(session.user.role)) {
          router.replace("/unauthorized");
        } else {
          setAuthorized(true);
        }
        setLoading(false);
      });
    }, []);

    if (loading) return <p>Loading...</p>;

    return authorized ? <Component {...props} /> : null;
  };
}
