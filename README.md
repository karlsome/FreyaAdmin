# Freya Admin Panel

## Overview
A comprehensive single-page application (SPA) for factory management and customer administration. Built with vanilla JavaScript, HTML5, and Tailwind CSS for optimal performance and maintainability.

## Features

### 🏭 **Factory Management**
- Dashboard with factory overview and analytics
- Real-time defect rate tracking
- Process monitoring and approvals
- Monthly summary reports

### 🔧 **Equipment Analytics**
- Real-time equipment performance monitoring
- Shot count tracking (per day/hour)
- Working hours analysis
- Equipment efficiency metrics
- Date range filtering
- Equipment-specific reports
- PDF export functionality
- Individual equipment data visualization

### 👥 **User Management** (Admin Only)
- Create, edit, and manage users
- Role-based access control (admin, 班長, member)
- User search and filtering capabilities

### 📊 **Analytics & Reporting**
- Interactive charts and graphs
- CSV/PDF export functionality
- Monthly defect rate analytics
- Factory performance metrics

### 🗄️ **Master Database**
- Product information management
- CSV import/export capabilities
- Advanced filtering and search
- Multi-language support (EN/JP)

### 🎯 **Customer Management** (Admin Only)
- Master user creation and management
- Device registration and tracking
- Company and database management
- Bulk operations support

## Architecture

### Single-Page Application
- **Navigation**: Persistent sidebar with role-based access control
- **Routing**: Hash-based navigation (`#page`) for direct linking
- **State Management**: Local storage for user authentication
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### File Structure
```
├── index.html          # Main application page
├── login.html          # Authentication page
├── css/
│   └── styles.css      # Custom styles
├── js/
│   ├── app.js          # Main application logic & routing
│   ├── navbar.js       # Navigation management
│   ├── languages.js    # Internationalization
│   └── [modules].js    # Feature-specific modules
└── src/
    └── logo.png        # Application logo
```

## User Roles & Permissions

| Feature | Admin | 班長 | Member |
|---------|-------|------|--------|
| Dashboard | ✅ | ✅ | ✅ |
| Factories | ✅ | ✅ | ❌ |
| Master DB | ✅ | ✅ | ❌ |
| Approvals | ✅ | ✅ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Customer Management | ✅ | ❌ | ❌ |
| Analytics | ✅ | ❌ | ❌ |

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server for local development (optional)

### Running the Application

#### Option 1: Direct File Access
Simply open `index.html` in your web browser.

#### Option 2: Local Web Server
```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8080
```

Then navigate to `http://localhost:8080`

### Authentication
Use the login page (`login.html`) to authenticate users. The system uses local storage for session management.

## Configuration

### API Endpoints
The application connects to external APIs for data management:
- **Master User API**: `https://kurachi.onrender.com`
- **Main Database**: Configurable via `BASE_URL` in `app.js`

### Language Support
Switch between English and Japanese using the language selector in the header. Translations are managed in `js/languages.js`.

## Development

### Adding New Features
1. Add route to `roleAccess` and `navItemsConfig` in `app.js`
2. Create case in `loadPage()` function
3. Add translations to `languages.js`
4. Implement feature-specific logic

### Code Standards
- Use vanilla JavaScript for compatibility
- Follow ES6+ standards where supported
- Maintain responsive design principles
- Include proper error handling

## Production Deployment

### Optimization Checklist
- ✅ Remove test/debug code
- ✅ Minify CSS/JS files (optional)
- ✅ Configure proper API endpoints
- ✅ Test all user roles and permissions
- ✅ Verify mobile responsiveness

### Security Considerations
- Implement proper authentication on the backend
- Use HTTPS in production
- Validate all user inputs
- Implement rate limiting for API calls

## Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License
Private/Internal Use Only

---

**Last Updated**: June 14, 2025
**Version**: 1.0.0 (Production Ready)
