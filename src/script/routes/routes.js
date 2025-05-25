import Home from '../view/pages/home';
import Login from '../view/pages/login';
import Register from '../view/pages/register';
import Dashboard from '../view/pages/dashboard';

const routes = {
    '/': {
        render: () => Home.render(),
        afterRender: () => Home.afterRender(),
        needsAuth: false,
    },
    '/login': {
        render: () => Login.render(),
        afterRender: () => Login.afterRender(),
        needsAuth: false,
    },
    '/register': {
        render: () => Register.render(),
        afterRender: () => Register.afterRender(),
        needsAuth: false,
    },
    '/dashboard': {
        render: () => Dashboard.render(),
        afterRender: () => Dashboard.afterRender(),
        needsAuth: true,
    },
};

export default routes; 