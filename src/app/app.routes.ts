import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { HomeComponent } from './pages/home/home.component';
import { CmsComponent } from './pages/cms/cms.component';
import { ProductsComponent } from './pages/products/products.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { Role } from './models/auth.model';

export const routes: Routes = [
    { path: 'auth', component: AuthComponent },
    { path: '', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'cms', component: CmsComponent, canActivate: [AuthGuard] },
    { path: 'products', component: ProductsComponent, canActivate: [AuthGuard] },
    { path: 'inventory', component: InventoryComponent, canActivate: [AuthGuard] },
    { path: 'orders', component: OrdersComponent, canActivate: [AuthGuard] },
    { 
        path: 'reports', 
        component: ReportsComponent, 
        canActivate: [AuthGuard] // Now accessible to all authenticated users
    },
    { path: '**', redirectTo: 'auth' }
];
