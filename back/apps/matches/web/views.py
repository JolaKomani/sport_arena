from django.conf import settings
from django.shortcuts import render


def match_list_view(request):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


def match_create_view(request):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


def match_detail_view(request, pk):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})


def match_update_view(request, pk):
    return render(request, "spa.html", {"vite_dev": settings.DEBUG})