import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CmsComponent } from './pages/cms/cms.component';
import { ProductsComponent } from './pages/products/products.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { ReportsComponent } from './pages/reports/reports.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'cms', component: CmsComponent },
    { path: 'products', component: ProductsComponent },
    { path: 'inventory', component: InventoryComponent },
    { path: 'orders', component: OrdersComponent },
    { path: 'reports', component: ReportsComponent },
    { path: '**', redirectTo: '' }
];
