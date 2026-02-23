from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import FlexibleTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', FlexibleTokenObtainPairView.as_view(), name='token-obtain'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/auth/', include('users.urls')),
    path('api/', include('properties.urls')),
    path('api/', include('billing.urls')),
    path('api/reports/', include('reports.urls')),
]
