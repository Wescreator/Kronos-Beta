import { createServerClient } from '@supabase/ssr'
import { NextResponse }        from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Páginas públicas — não precisam de autenticação
  const publicPaths = ['/login', '/auth/callback', '/change-password']
  const isPublic    = publicPaths.some(p => pathname.startsWith(p))

  // Páginas do app — precisam de autenticação
  const appPaths = [
    '/dashboard','/projects','/tasks','/members',
    '/chat','/meetings','/agenda','/files','/settings',
  ]
  const isApp = appPaths.some(p => pathname.startsWith(p))

  // Sem sessão tentando acessar app → vai para login
  if (!user && isApp) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Com sessão tentando acessar login → vai para dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}