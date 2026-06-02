import json

from django.db.models import Avg
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout

from apps.users.models import User


@csrf_exempt
def user_list_api(request):
    users = User.objects.all()

    users_list = list(users.values("id", "first_name", "last_name", "email", "phone"))

    return HttpResponse(json.dumps(users_list), content_type="application/json")


@csrf_exempt
def user_detail_api(request, pk):
    user = User.objects.filter(pk=pk).first()
    if not user:
        return HttpResponse("user not found", status=404)

    user_data = {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone': user.phone,
    }

    return HttpResponse(json.dumps(user_data), content_type="application/json")


