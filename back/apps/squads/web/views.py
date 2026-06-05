# Template views for squads app
from django.conf import settings
from django.shortcuts import render


def squads_list_view(request):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


def squad_create_view(request):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


def squad_detail_view(request, pk):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


def squad_update_view(request, pk):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


def squad_matches_view(request, pk):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})
