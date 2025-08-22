# Website Blocker Chrome Extension

A productivity-focused Chrome extension that blocks distracting websites and includes a Pomodoro timer to help users stay focused.

## Core Purpose

This Chrome extension combines website blocking with Pomodoro timer functionality to create a comprehensive productivity tool. Users can create custom blocking categories, run focused work sessions, and maintain productivity through structured time management.

## Key Features

### 1. Website Blocking System
- **Category-based blocking**: Users can create custom categories (default: "General") 
- **Active category system**: Only one category blocks sites at a time
- **Content script blocking**: Shows full-screen overlay on blocked sites with motivational message
- **URL matching**: Supports exact domains and subdomains

### 2. Pomodoro Timer
- **Three session types**: Pomodoro (25min), Short Break (5min), Long Break (15min)
- **Session tracking**: Counts completed sessions and pomodoros
- **Visual interface**: Progress bar, timer display, session tabs
- **Background persistence**: Timer continues running when popup is closed

### 3. Unified Mode (Recent Addition)
- **Timer-blocking integration**: Automatically activates blocking categories during focus sessions
- **Configurable categories**: Different categories for focus vs break periods
- **Backward compatibility**: Optional feature that doesn't disrupt existing workflows

### 4. Dashboard Interface
- **Full-screen management**: Comprehensive productivity dashboard
- **Navigation system**: Sidebar with different sections
- **Analytics planning**: Chart.js integration planned for productivity metrics
- **Settings management**: Theme switching, configuration options

## Technical Architecture

### Chrome Extension Structure
- **Manifest V3**: Modern extension format with service worker background
- **Content scripts**: Inject blocking overlay on all websites
- **Popup interface**: Quick access to timer and settings
- **Dashboard**: Full-featured management interface

### Key Components
- **Background services**: Timer, Categories, Storage, Messaging
- **Unified orchestrator**: Coordinates timer and blocking integration
- **Storage**: Chrome Storage API for local/sync data persistence
- **Communication**: Chrome runtime messaging between components

## File Structure

```
src/
├── background/           # Service worker and background logic
│   ├── index.js         # Main background script entry point
│   ├── timer.service.js # Pomodoro timer management
│   ├── categories.service.js # Website category management
│   ├── unified-orchestrator.js # Timer-blocking coordination
│   └── ...
├── content/             # Content script for website blocking
│   └── content.js       # Blocking overlay injection
├── dashboard/           # Full-screen management interface
│   ├── index.html       # Main dashboard layout
│   └── ...
├── popup/               # Extension popup interface
│   ├── popup.html       # Popup layout
│   ├── popup.js         # Timer interface logic
│   └── popup.css        # Popup styling
└── assets/              # Icons, sounds, and styling
    ├── icons/
    ├── sounds/
    └── css/
```

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project directory
5. The extension will appear in your toolbar

## Usage

1. **Quick Timer Access**: Click the extension icon to access the Pomodoro timer
2. **Add Blocked Sites**: Use the "+" button in the popup to quickly add websites
3. **Full Dashboard**: Click the dashboard button for comprehensive management
4. **Unified Mode**: Toggle timer-blocking integration for automatic category switching

## Development Complexity Assessment

### Complexity Level: **Moderate to High**

This project demonstrates significant complexity suitable for advanced web development courses:

#### High Complexity Indicators:
- **Chrome Extension Architecture**: Requires understanding Manifest V3, service workers, content scripts, and cross-context messaging
- **Multi-component System**: 15+ JavaScript files with intricate dependencies
- **Advanced JavaScript Concepts**: Async/await, Chrome APIs, real-time state synchronization
- **Background Service Management**: Timer persistence, unified orchestration, category management
- **Cross-Context Communication**: Popup ↔ Background ↔ Content Script messaging

#### Educational Suitability:
| Course Level | Complexity Rating | Feasibility |
|---|---|---|
| Intro Web Development | Too Complex | Would be overwhelming |
| Intermediate JavaScript | Quite Complex | Challenging but possible with guidance |
| Advanced Web Development | Appropriate | Good learning project |
| Senior Capstone | Well-Suited | Perfect scope and complexity |
| Graduate Project | Moderate | Good but could be more ambitious |

### Recommended For:
- **Senior capstone projects** or **advanced web development courses** where students have strong JavaScript fundamentals
- Students learning Chrome extension development
- Projects focusing on browser APIs and cross-context communication

## Technologies Used

- **JavaScript (ES6+)**: Core functionality and Chrome extension APIs
- **HTML5 & CSS3**: User interface and styling
- **Chrome Extension APIs**: Storage, messaging, tabs, notifications
- **Tailwind CSS**: Styling framework for dashboard
- **Chart.js**: Planned for analytics visualization
- **Font Awesome**: Icon library

## Future Enhancements

- Analytics dashboard with productivity metrics
- Cloud synchronization with authentication
- Advanced timer configurations
- Productivity insights and reporting
- Enhanced notification system

## License

This project is for educational purposes and demonstrates modern web development practices in the context of browser extension development.