import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Application navigation bar component
 * Provides navigation links and responsive design
 */
@Component({
  selector: 'app-bar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app-bar.component.html',
  styleUrl: './app-bar.component.css'
})
export class AppBarComponent {

}
