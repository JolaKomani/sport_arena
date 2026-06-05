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


@csrf_exempt
def user_create_api(request):
    data = json.loads(request.body)

    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if not all((first_name, last_name, email, password)):
        return HttpResponse('first_name, last_name, email and password are required')

    if User.objects.filter(email=email).exists():
        return HttpResponse('User with this email exists')

    user = User(email=email, first_name=first_name, last_name=last_name, phone=phone)
    user.set_password(password)
    user.save()

    login(request, user)

    return HttpResponse('User created successfully')


@csrf_exempt
def user_update_api(request):
    """Update user profile. Requires authentication and user can only update their own profile."""
    if not request.user.is_authenticated:
        return HttpResponse('Authentication required', status=401)

    data = json.loads(request.body)

    user_id = data.get('user_id')
    if not user_id:
        return HttpResponse('user_id is required', status=400)

    user = User.objects.filter(pk=user_id).first()
    if not user:
        return HttpResponse('user not found', status=404)

    # Ensure user can only update their own profile
    if request.user.id != user.id:
        return HttpResponse('You can only update your own profile', status=403)

    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    if email:
        # Check if email is already taken by another user
        if User.objects.filter(email=email).exclude(id=user.id).exists():
            return HttpResponse('Email already exists', status=400)
        user.email = email
    if phone:
        user.phone = phone
    if password:
        # Update password
        user.set_password(password)
        user.save()
        return HttpResponse('User updated successfully')

    user.save()
    return HttpResponse('User updated successfully')


@csrf_exempt
def user_delete_api(request):
    data = json.loads(request.body)
    user_id = data.get('user_id')
    if not user_id:
        return HttpResponse('user_id is required')
    user = User.objects.filter(pk=user_id).first()
    if not user:
        return HttpResponse('user not found')
    user.delete()
    return HttpResponse('User deleted successfully')


@csrf_exempt
def user_login_api(request):
    """Login API - uses Django's authenticate() and login()"""
    data = json.loads(request.body)
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return HttpResponse('email and password are required', status=400)

    # Use Django's authenticate() - pass email as 'username' since USERNAME_FIELD='email'
    user = authenticate(request, username=email, password=password)

    if user is None:
        return HttpResponse('Invalid email or password', status=401)

    login(request, user)

    return JsonResponse({
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email
        }
    })


@csrf_exempt
def user_logout_api(request):
    """Logout API - uses Django's logout()"""
    logout(request)
    return HttpResponse('Logged out successfully')


@csrf_exempt
def user_me_api(request):
    """Get current logged in user via request.user"""
    if not request.user.is_authenticated:
        return HttpResponse('Not authenticated', status=401)

    user = request.user
    return JsonResponse({
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone': user.phone,
        'full_name': user.full_name
    })
