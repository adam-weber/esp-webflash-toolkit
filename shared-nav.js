// Load shared navbar
fetch('navbar.html')
    .then(response => response.text())
    .then(html => {
        const container = document.getElementById('navbar-container');
        if (container) {
            container.innerHTML = html;
        }
    })
    .catch(error => console.error('Error loading navbar:', error));
