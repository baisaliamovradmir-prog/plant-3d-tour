from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

class ValidatedModelSerializer(serializers.ModelSerializer):
    """Run model clean() for PATCH as well as creates; DB remains final constraint guard."""
    def validate(self, attrs):
        attrs = super().validate(attrs)
        model = self.Meta.model
        values = {}
        if self.instance:
            values = {field.attname: getattr(self.instance, field.attname) for field in model._meta.concrete_fields}
        candidate = model(**values)
        for key, value in attrs.items():
            setattr(candidate, key, value)
        candidate._state.adding = self.instance is None
        try:
            candidate.full_clean(exclude=['id'], validate_unique=False, validate_constraints=False)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
        # Parent changes require explicit relinking, preventing stale cross-enterprise references.
        if self.instance:
            for name in getattr(self, 'immutable_links', ()):
                if name in attrs and getattr(self.instance, name + '_id') != attrs[name].pk:
                    raise serializers.ValidationError({name: 'Связь нельзя менять. Создайте новую запись и перенесите зависимости.'})
        return attrs
