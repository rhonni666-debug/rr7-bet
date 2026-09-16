import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/Home';
import { GamesPage } from './pages/Games';
import { PromotionsPage } from './pages/Promotions';
import { WalletPage } from './pages/Wallet';
import { ProfilePage } from './pages/Profile';
import { HistoryPage } from './pages/History';
import { GamePage } from './pages/Game';
import { AuthPage } from './pages/Auth';
import { ResetPasswordPage } from './pages/ResetPassword';
import { AdminPage } from './pages/Admin';
import { AdminOperationsPage } from './pages/AdminOperations';

const rootRoute = createRootRoute({ component: () => <AppShell><Outlet /></AppShell> });
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const promotionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/promocoes', component: PromotionsPage });
const gamesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/jogos', component: GamesPage });
const walletRoute = createRoute({ getParentRoute: () => rootRoute, path: '/carteira', component: WalletPage });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/perfil', component: ProfilePage });
const historyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/historico', component: HistoryPage });
const gameRoute = createRoute({ getParentRoute: () => rootRoute, path: '/jogo/$slug', component: GamePage });
const authRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth', component: AuthPage });
const resetPasswordRoute = createRoute({ getParentRoute: () => rootRoute, path: '/redefinir-senha', component: ResetPasswordPage });
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: () => <AdminPage section="dashboard" /> });
const adminGamesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/jogos', component: () => <AdminPage section="games" /> });
const adminProvidersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/provedores', component: () => <AdminPage section="providers" /> });
const adminCategoriesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/categorias', component: () => <AdminPage section="categories" /> });
const adminBannersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/banners', component: () => <AdminPage section="banners" /> });
const adminPromotionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/promocoes', component: () => <AdminPage section="promotions" /> });
const adminUsersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/usuarios', component: () => <AdminPage section="users" /> });
const adminSessionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/sessoes', component: () => <AdminOperationsPage section="sessions" /> });
const adminTransactionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/transacoes', component: () => <AdminOperationsPage section="transactions" /> });
const adminAuditRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/auditoria', component: () => <AdminPage section="audit" /> });

const routeTree = rootRoute.addChildren([
  homeRoute,
  promotionsRoute,
  gamesRoute,
  walletRoute,
  profileRoute,
  historyRoute,
  gameRoute,
  authRoute,
  resetPasswordRoute,
  adminRoute,
  adminGamesRoute,
  adminProvidersRoute,
  adminCategoriesRoute,
  adminBannersRoute,
  adminPromotionsRoute,
  adminUsersRoute,
  adminSessionsRoute,
  adminTransactionsRoute,
  adminAuditRoute,
]);

const basepath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const router = createRouter({ routeTree, basepath });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
