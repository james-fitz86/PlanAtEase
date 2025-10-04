from rest_framework import serializers

class ContactMessageSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    subject = serializers.CharField(max_length=200)
    message = serializers.CharField(max_length=5000)
    hp = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate(self, data):
        if data.get("hp"):
            raise serializers.ValidationError("Invalid submission.")
        return data