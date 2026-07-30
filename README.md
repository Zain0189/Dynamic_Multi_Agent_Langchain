# For regular updates push the code on development branch:

# Make sure you are on development branch

git checkout development

# Stage changed files

git add .

# Commit changes

git commit -m "Add feature description"

# Push updates to development branch on GitHub

git push origin development

# When a feature is developed and tested push the code to main(production) branch

# 1. Switch to production branch

git checkout main

# 2. Pull latest production code just in case

git pull origin main

# 3. Merge tested changes from development into production

git merge development

# 4. Push updated production code to GitHub

git push origin main

# 5. Switch back to development to continue working

git checkout development
