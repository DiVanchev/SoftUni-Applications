
const loginLink = document.querySelector('a[href="#login"]');
const registerLink = document.querySelector('a[href="#register"]');
const sellLink = document.querySelector('a[href="#sell"]');
const logoutLink = document.querySelector('a[href="#logout"]');
const guestLinks = document.querySelectorAll('.guest a');
const userLinks = document.querySelectorAll('.user a');

function updateNavBar() {
  if (isLoggedIn) {
    // Show user-specific links (Sell, Logout) and hide guest links (Login, Register)
    userLinks.forEach(link => link.style.display = 'block');
    guestLinks.forEach(link => link.style.display = 'none');
  } else {
    // Show guest-specific links (Login, Register) and hide user links (Sell, Logout)
    userLinks.forEach(link => link.style.display = 'none');
    guestLinks.forEach(link => link.style.display = 'block');
  }
}

// Handle Logout functionality
function handleLogout() {
  localStorage.setItem('isLoggedIn', 'false'); // Set logged-in state to false
  updateNavBar(); // Update the NavBar visibility
  alert('You have logged out!');
}

// Add event listener to the logout link
logoutLink.addEventListener('click', (event) => {
  event.preventDefault();
  handleLogout();
});

// Update the NavBar based on the login status when the page loads
updateNavBar();
