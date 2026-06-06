from django.conf import settings
from django.shortcuts import render
from django.contrib.auth.decorators import login_required


def user_create_view(request):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


def user_login_view(request):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


@login_required
def user_performance_view(request):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


@login_required
def user_profile_view(request):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})
