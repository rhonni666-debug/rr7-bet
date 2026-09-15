import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/Home';
import { GamesPage } from './pages/Games';
import { PromotionsPage } from './pages/Promotions';
import { WalletPage } from './pages/Wallet';
import { ProfilePage } from './pages/Profile';
import { GamePage } from './pages/Game';
import { AuthPage } from './pages/Auth';
import { ResetPasswordPage } from './pages/ResetPassword';

const rootRoute = createRootRoute({ component: () => <AppShell><Outlet /></AppShell> });
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const promotionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/promocoes', component: PromotionsPage });
const gamesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/jogos', component: GamesPage });
const walletRoute = createRoute({ getParentRoute: () => rootRoute, path: '/carteira', component: WalletPage });
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/perfil', component: ProfilePage });
const gameRoute = createRoute({ getParentRoute: () => rootRoute, path: '/jogo/$slug', component: GamePage });
const authRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth', component: AuthPage });
const resetPasswordRoute = createRoute({ getParentRoute: () => rootRoute, path: '/redefinir-senha', component: ResetPasswordPage });

const routeTree = rootRoute.addChildren([
  homeRoute,
  promotionsRoute,
  gamesRoute,
  walletRoute,
  profileRoute,
  gameRoute,
  authRoute,
  resetPasswordRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
