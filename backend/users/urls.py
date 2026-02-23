from django.urls import path

from . import views

urlpatterns = [
    path('me/', views.me, name='user-me'),
    path('change-password/', views.change_password, name='change-password'),
]
