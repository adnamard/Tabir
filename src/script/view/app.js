import routes from '../routes/routes';

class App {
    constructor({ content }) {
        this._content = content;
    }

    async renderPage() {
        const url = window.location.hash.slice(1).toLowerCase();
        const page = routes[url] || routes['/'];

        // Check authentication for protected routes
        if (page.needsAuth) {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                window.location.hash = '#/login';
                return;
            }
        }

        // Prevent accessing login/register when already authenticated
        if ((url === '/login' || url === '/register') && localStorage.getItem('auth_token')) {
            window.location.hash = '#/dashboard';
            return;
        }

        this._content.innerHTML = await page.render();
        await page.afterRender();
    }
}

export default App; 