$(document).ready(function () {
    $('#login-form').on('submit', function (e) {
        e.preventDefault();

        const username = $('#login-Username').val();
        const password = $('#login-password').val();

        $.post('/auth/login', { username, password })
            .done(function (response) {
                if (response.error) {
                    alert(response.error);
                } else {
                    const urlParams = new URLSearchParams(window.location.search);
                    let redirectUrl = urlParams.get('r') || '/';

                    const isValidRedirect = redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.includes('://');
                    if (!isValidRedirect) {
                        redirectUrl = '/';
                    }

                    window.location.href = redirectUrl;
                }
            })
            .fail(function () {
                alert('An unexpected error occurred. Please try again.');
            });
    });
});
