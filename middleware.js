const PROTECTED_PATHS = new Set([
 '/admin',
 '/admin-certs',
 '/admin-settings'
]);

function isProtectedPath(pathname) {
 if (PROTECTED_PATHS.has(pathname)) {
  return true;
 }

 return pathname.startsWith('/admin/');
}

async function hasValidSession(request) {
 const cookieHeader = request.headers.get('cookie') || '';
 if (!cookieHeader) {
  return false;
 }

 const verifyUrl = new URL('/api/auth/verify', request.url);

 try {
  const response = await fetch(verifyUrl, {
   method: 'GET',
   headers: {
	cookie: cookieHeader
   }
  });

  return response.ok;
 } catch (_error) {
  return false;
 }
}

export default async function middleware(request) {
 const { pathname } = new URL(request.url);

 if (!isProtectedPath(pathname)) {
  return;
 }

 const authenticated = await hasValidSession(request);
 if (authenticated) {
  return;
 }

 const loginUrl = new URL('/admin-login', request.url);
 loginUrl.searchParams.set('from', pathname);
 return Response.redirect(loginUrl, 307);
}

export const config = {
 matcher: ['/admin', '/admin-certs', '/admin-settings', '/admin/:path*']
};