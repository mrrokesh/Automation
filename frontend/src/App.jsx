import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { useAuth } from './useAuth'
import Layout from './components/Layout'
import Home from './pages/Home'
import Pricing from './pages/Pricing'
import Auth from './pages/Auth'
import AdminLogin from './pages/AdminLogin'
import PublicForm from './pages/PublicForm'
import Support from './pages/Support'
import Workspace from './workspace/Workspace'
import { Article, Blog, CardPage, Guides, Legal, NotFound } from './pages/Pages'

// The workspace needs a signed-in user; everyone else goes to the login page.
function Protected({ children }) {
  const { ready, user } = useAuth()
  if (!ready) return <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading"><span className="size-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" /></div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pricing" element={<Pricing />} />
          {['channels', 'solutions', 'case-studies', 'careers'].map((p) => <Route key={p} path={p} element={<CardPage page={p} />} />)}
          {['privacy', 'terms', 'refund'].map((p) => <Route key={p} path={p} element={<Legal page={p} />} />)}
          <Route path="support" element={<Support />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<Article kind="blog" />} />
          <Route path="guides" element={<Guides />} />
          <Route path="guides/:slug" element={<Article kind="guide" />} />
        </Route>
        <Route path="login" element={<Auth />} />
        <Route path="admin" element={<AdminLogin />} />
        <Route path="admin/login" element={<AdminLogin />} />
        <Route path="form" element={<PublicForm />} />
        <Route path="form/:id" element={<PublicForm />} />
        <Route path="app/*" element={<Protected><Workspace /></Protected>} />
        <Route element={<Layout />}><Route path="*" element={<NotFound />} /></Route>
      </Routes>
    </AuthProvider>
  )
}
