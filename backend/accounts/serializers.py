from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from .models import User

POLICY_VERSION = '2026-11-09'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'consent_at', 'policy_version']
        read_only_fields = fields

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, max_length=128)
    consent = serializers.BooleanField(write_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'consent']
        extra_kwargs = {'email': {'required': True, 'allow_blank': False}, 'id': {'read_only': True}}

    def validate(self, attrs):
        if not attrs['consent']:
            raise serializers.ValidationError({'consent': 'Требуется согласие на обработку персональных данных.'})
        validate_password(attrs['password'], User(username=attrs['username'], email=attrs['email']))
        return attrs

    def create(self, validated_data):
        validated_data.pop('consent')
        return User.objects.create_user(**validated_data, consent_at=timezone.now(), policy_version=POLICY_VERSION)

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
