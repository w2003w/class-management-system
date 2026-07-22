(function() {
    var path = window.location.pathname;
    var pages = ['dashboard', 'attendance', 'exam', 'vote', 'profile', 'users', 'settings', 'grading', 'participate', 'chat'];
    var pageName = path.substring(1).split('?')[0].split('#')[0];
    
    if (pages.includes(pageName) && !path.includes('.')) {
        window.location.replace('/' + pageName + '.html');
    }
})();