$(document).ready(function () {
    $('#login-form').on('submit', function (e) {
        e.preventDefault();

        const username = $('#login-username').val();
        const password = $('#login-password').val();

        const loginConfirm = $("#login-confirm")
        loginConfirm.text("Logging in...")
        loginConfirm.addClass("loading")

        $.post('/auth/login', { username, password })
            .done(function (response) {
                if (response.error) {
                    $("#error").text(response.error)
                    loginConfirm.text("Log In")
                    loginConfirm.removeClass("loading")
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
