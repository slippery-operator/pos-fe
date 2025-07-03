import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CmsComponent } from './pages/cms/cms.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'cms', component: CmsComponent },
    { path: '**', redirectTo: '' }
];
