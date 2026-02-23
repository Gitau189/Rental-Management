from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import ChangePasswordSerializer, UserSerializer


# ── Flexible login: accept username OR email ──────────────────────────────────

class FlexibleTokenSerializer(TokenObtainPairSerializer):
    """Allow users to authenticate with either their username or email address."""

    def validate(self, attrs):
        identifier = attrs.get(self.username_field, '').strip()

        # If the identifier looks like an email (or no user found by username),
        # try to resolve the actual username from the email field.
        if not User.objects.filter(username=identifier).exists():
            user_by_email = User.objects.filter(email__iexact=identifier).first()
            if user_by_email:
                attrs[self.username_field] = user_by_email.username

        return super().validate(attrs)


class FlexibleTokenObtainPairView(TokenObtainPairView):
    serializer_class = FlexibleTokenSerializer


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
