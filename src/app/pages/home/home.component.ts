import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Home page component
 * Displays welcome message and navigation options
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
