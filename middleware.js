import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // Redirect to login if not authenticated
  },
  callbacks: {
    authorized: ({ token }) => !!token, // Check if the user has a valid session
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"], // Protect these routes
};
