# Client Management System (CMS)

A modern, responsive Angular 18 application for managing client relationships with a clean, professional UI built with Bootstrap 5.

## 🚀 Features

### Core Functionality
- **Client Management**: Add, edit, and delete clients
- **Real-time Validation**: Form validation with immediate feedback
- **Responsive Design**: Mobile-friendly interface
- **Professional UI**: Clean, modern design with Bootstrap 5

### User Experience
- **Loading States**: Visual feedback during data operations
- **Toast Notifications**: Success, error, and info messages
- **Error Handling**: Comprehensive error management with retry options
- **Keyboard Navigation**: Support for Enter/Escape keys in forms

### Technical Features
- **Angular 18**: Latest Angular framework with standalone components
- **RxJS Integration**: Reactive programming for state management
- **Modular Architecture**: Shared components and services
- **TypeScript**: Full type safety throughout the application

## 🛠️ Technology Stack

- **Frontend Framework**: Angular 18
- **UI Framework**: Bootstrap 5.3
- **Icons**: Bootstrap Icons
- **Notifications**: ngx-toastr
- **State Management**: RxJS Observables
- **Styling**: CSS3 with custom variables

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── loading-spinner/     # Reusable loading component
│   │   │   └── error-display/       # Reusable error component
│   │   ├── add-client-modal/        # Client addition modal
│   │   └── app-bar/                 # Navigation bar
│   ├── models/
│   │   └── client.model.ts          # Client data models
│   ├── pages/
│   │   ├── home/                    # Home page
│   │   └── cms/                     # Client management page
│   └── services/
│       ├── client.service.ts        # Client CRUD operations
│       └── toast.service.ts         # Toast notifications
├── styles.css                       # Global styles
└── main.ts                          # Application entry point
```

## 🎯 Key Components

### Shared Components

#### LoadingSpinnerComponent
- **Purpose**: Displays loading states throughout the application
- **Features**: 
  - Customizable size (sm, md, lg)
  - Optional loading text
  - Bootstrap spinner styling

#### ErrorDisplayComponent
- **Purpose**: Shows error messages with retry functionality
- **Features**:
  - Bootstrap alert styling
  - Retry button support
  - Customizable error titles

### Services

#### ClientService
- **Purpose**: Handles all client-related API operations
- **Features**:
  - CRUD operations (Create, Read, Update, Delete)
  - Loading state management
  - Error handling with detailed messages
  - RxJS operators for reactive programming

#### ToastService
- **Purpose**: Manages toast notifications
- **Features**:
  - Success, error, warning, and info notifications
  - Configurable timeouts and positions
  - Consistent styling across the application

## 🎨 Design Principles

### UI/UX Guidelines
- **Clean and Professional**: Minimal design with clear hierarchy
- **Responsive**: Works seamlessly on all device sizes
- **Accessible**: Proper ARIA labels and keyboard navigation
- **Consistent**: Uniform styling and behavior patterns

### Code Architecture
- **Modular**: Reusable components and services
- **Type-Safe**: Full TypeScript implementation
- **Reactive**: RxJS for state management
- **Maintainable**: Clear separation of concerns

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:4200`

### Build for Production
```bash
npm run build
```

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full-featured interface with all controls
- **Tablet**: Adapted layout with touch-friendly elements
- **Mobile**: Streamlined interface with essential features

## 🔧 Configuration

### API Configuration
Update the API URL in `src/app/services/client.service.ts`:
```typescript
private apiUrl = 'http://localhost:9000/clients';
```

### Toast Configuration
Modify toast settings in `src/app/app.config.ts`:
```typescript
provideToastr({
  timeOut: 3000,
  positionClass: 'toast-top-right',
  preventDuplicates: true,
  closeButton: true,
  progressBar: true
})
```

## 🎯 Future Enhancements

- [ ] Analytics Dashboard
- [ ] User Authentication
- [ ] Advanced Search and Filtering
- [ ] Data Export/Import
- [ ] Real-time Notifications
- [ ] Dark Mode Theme

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.
