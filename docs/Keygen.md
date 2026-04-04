# Generate the private key
openssl ecparam -name prime256v1 -genkey -noout -out keys/private.pem

# Extract the public key from the private key
openssl ec -in keys/private.pem -pubout -out keys/public.pem