import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AdminRoute, ProtectedRoute } from '../components/auth/RouteGuards'
import { AppLayout } from '../components/layout/AppLayout'
import { LoadingSkeleton } from '../components/ui'
import { StorefrontHomePage } from '../pages/shop/StorefrontHomePage'

const StorefrontCategoriesPage = lazy(() => import('../pages/shop/StorefrontCategoriesPage').then(module => ({ default: module.StorefrontCategoriesPage })))
const StorefrontProductPage = lazy(() => import('../pages/shop/StorefrontProductPage').then(module => ({ default: module.StorefrontProductPage })))
const ShopPage = lazy(() => import('../pages/shop/ShopPages').then(module => ({ default: module.ShopPage })))
const CartPage = lazy(() => import('../pages/shop/ShopPages').then(module => ({ default: module.CartPage })))
const FavoritesPage = lazy(() => import('../pages/shop/ShopPages').then(module => ({ default: module.FavoritesPage })))
const CategoryPage = lazy(() => import('../pages/shop/ShopPages').then(module => ({ default: module.CategoryPage })))
const PromotionsPage = lazy(() => import('../pages/shop/ShopPages').then(module => ({ default: module.PromotionsPage })))
const SearchPage = lazy(() => import('../pages/shop/ShopPages').then(module => ({ default: module.SearchPage })))

const LoginPage = lazy(() => import('../pages/auth/AuthPages').then(module => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('../pages/auth/AuthPages').then(module => ({ default: module.RegisterPage })))
const ForgotPage = lazy(() => import('../pages/auth/AuthPages').then(module => ({ default: module.ForgotPage })))
const ResetPasswordPage = lazy(() => import('../pages/auth/AuthPages').then(module => ({ default: module.ResetPasswordPage })))

const AccountDashboard = lazy(() => import('../pages/account/AccountPages').then(module => ({ default: module.AccountDashboard })))
const ProfilePage = lazy(() => import('../pages/account/AccountPages').then(module => ({ default: module.ProfilePage })))
const AddressesPage = lazy(() => import('../pages/account/AccountPages').then(module => ({ default: module.AddressesPage })))
const OrdersPage = lazy(() => import('../pages/account/AccountPages').then(module => ({ default: module.OrdersPage })))
const OrderDetailPage = lazy(() => import('../pages/account/AccountPages').then(module => ({ default: module.OrderDetailPage })))
const ReviewsPage = lazy(() => import('../pages/account/AccountPages').then(module => ({ default: module.ReviewsPage })))
const SettingsPage = lazy(() => import('../pages/account/AccountPages').then(module => ({ default: module.SettingsPage })))

const TrackingPage = lazy(() => import('../pages/checkout/CheckoutPages').then(module => ({ default: module.TrackingPage })))
const SupabaseCheckoutPage = lazy(() => import('../pages/checkout/SupabaseCheckoutPages').then(module => ({ default: module.SupabaseCheckoutPage })))
const SupabaseConfirmationPage = lazy(() => import('../pages/checkout/SupabaseCheckoutPages').then(module => ({ default: module.SupabaseConfirmationPage })))

const AdminDashboard = lazy(() => import('../pages/admin/AdminPages').then(module => ({ default: module.AdminDashboard })))
const AdminPromotions = lazy(() => import('../pages/admin/AdminPages').then(module => ({ default: module.AdminPromotions })))
const AdminReviews = lazy(() => import('../pages/admin/AdminPages').then(module => ({ default: module.AdminReviews })))
const AdminContent = lazy(() => import('../pages/admin/AdminPages').then(module => ({ default: module.AdminContent })))
const AdminSettings = lazy(() => import('../pages/admin/AdminPages').then(module => ({ default: module.AdminSettings })))
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage').then(module => ({ default: module.AdminProductsPage })))
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage').then(module => ({ default: module.AdminCategoriesPage })))
const AdminStocksPage = lazy(() => import('../pages/admin/AdminStocksPage').then(module => ({ default: module.AdminStocksPage })))
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage').then(module => ({ default: module.AdminOrdersPage })))
const AdminOrderDetailPage = lazy(() => import('../pages/admin/AdminOrdersPage').then(module => ({ default: module.AdminOrderDetailPage })))
const AdminClientsPage = lazy(() => import('../pages/admin/AdminClientsPage').then(module => ({ default: module.AdminClientsPage })))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })))

function RouteLoading() {
  return <div className="container section route-loading" role="status" aria-live="polite">
    <span className="eyebrow">Dom G Store</span>
    <LoadingSkeleton/>
    <span hidden>Chargement de la page…</span>
  </div>
}

export function AppRoutes() {
  return <Suspense fallback={<RouteLoading/>}>
    <Routes>
      <Route element={<AppLayout/>}>
        <Route index element={<StorefrontHomePage/>}/>
        <Route path="boutique" element={<ShopPage/>}/>
        <Route path="produits/:id" element={<StorefrontProductPage/>}/>
        <Route path="categories" element={<StorefrontCategoriesPage/>}/>
        <Route path="categories/:slug" element={<CategoryPage/>}/>
        <Route path="promotions" element={<PromotionsPage/>}/>
        <Route path="recherche" element={<SearchPage/>}/>
        <Route path="panier" element={<CartPage/>}/>
        <Route path="favoris" element={<FavoritesPage/>}/>
        <Route path="compte" element={<ProtectedRoute><AccountDashboard/></ProtectedRoute>}/>
        <Route path="compte/profil" element={<ProtectedRoute><ProfilePage/></ProtectedRoute>}/>
        <Route path="compte/adresses" element={<ProtectedRoute><AddressesPage/></ProtectedRoute>}/>
        <Route path="compte/commandes" element={<ProtectedRoute><OrdersPage/></ProtectedRoute>}/>
        <Route path="compte/commandes/:id" element={<ProtectedRoute><OrderDetailPage/></ProtectedRoute>}/>
        <Route path="compte/favoris" element={<ProtectedRoute><FavoritesPage/></ProtectedRoute>}/>
        <Route path="compte/avis" element={<ProtectedRoute><ReviewsPage/></ProtectedRoute>}/>
        <Route path="compte/parametres" element={<ProtectedRoute><SettingsPage/></ProtectedRoute>}/>
        <Route path="commande" element={<ProtectedRoute><SupabaseCheckoutPage/></ProtectedRoute>}/>
        <Route path="commande/confirmation/:id" element={<ProtectedRoute><SupabaseConfirmationPage/></ProtectedRoute>}/>
        <Route path="suivi/:id" element={<TrackingPage/>}/>
      </Route>
      <Route path="connexion" element={<LoginPage/>}/>
      <Route path="inscription" element={<RegisterPage/>}/>
      <Route path="mot-de-passe-oublie" element={<ForgotPage/>}/>
      <Route path="reinitialiser-mot-de-passe" element={<ResetPasswordPage/>}/>
      <Route path="admin" element={<AdminRoute><AdminDashboard/></AdminRoute>}/>
      <Route path="admin/produits" element={<AdminRoute><AdminProductsPage/></AdminRoute>}/>
      <Route path="admin/categories" element={<AdminRoute><AdminCategoriesPage/></AdminRoute>}/>
      <Route path="admin/stocks" element={<AdminRoute><AdminStocksPage/></AdminRoute>}/>
      <Route path="admin/commandes" element={<AdminRoute><AdminOrdersPage/></AdminRoute>}/>
      <Route path="admin/commandes/:id" element={<AdminRoute><AdminOrderDetailPage/></AdminRoute>}/>
      <Route path="admin/clients" element={<AdminRoute><AdminClientsPage/></AdminRoute>}/>
      <Route path="admin/clients/:id" element={<AdminRoute><AdminClientsPage/></AdminRoute>}/>
      <Route path="admin/promotions" element={<AdminRoute><AdminPromotions/></AdminRoute>}/>
      <Route path="admin/avis" element={<AdminRoute><AdminReviews/></AdminRoute>}/>
      <Route path="admin/contenu" element={<AdminRoute><AdminContent/></AdminRoute>}/>
      <Route path="admin/parametres" element={<AdminRoute><AdminSettings/></AdminRoute>}/>
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  </Suspense>
}
