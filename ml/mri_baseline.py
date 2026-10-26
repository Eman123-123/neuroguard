"""MRI baseline: Google Colab par chalao (GPU on karke).
Maqsad accuracy nahi, ye dekhna hai ke pipeline chal rahi hai.

Setup (Colab):
    1. Kaggle se "Alzheimer's MRI Dataset" download karo aur folder structure aisa rakho:
         data/train/<class_name>/*.jpg
         data/test/<class_name>/*.jpg
    2. !pip install torch torchvision scikit-learn
"""
import torch
import torch.nn as nn
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report

DATA_DIR = "data"
EPOCHS = 3
BATCH = 32
device = "cuda" if torch.cuda.is_available() else "cpu"

tf_train = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.Grayscale(num_output_channels=3),  # MRI grayscale hoti hai, model ko 3 channel chahiye
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
tf_test = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.Grayscale(num_output_channels=3),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

train_ds = datasets.ImageFolder(f"{DATA_DIR}/train", tf_train)
test_ds = datasets.ImageFolder(f"{DATA_DIR}/test", tf_test)
train_dl = DataLoader(train_ds, batch_size=BATCH, shuffle=True)
test_dl = DataLoader(test_ds, batch_size=BATCH)
print("Classes:", train_ds.classes)

model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
model.fc = nn.Linear(model.fc.in_features, len(train_ds.classes))
model = model.to(device)

# Class imbalance ke liye weights (Moderate class bohat chhoti hoti hai)
counts = torch.bincount(torch.tensor(train_ds.targets))
weights = (counts.sum() / (len(counts) * counts.float())).to(device)
criterion = nn.CrossEntropyLoss(weight=weights)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)

for epoch in range(EPOCHS):
    model.train()
    total = 0.0
    for x, y in train_dl:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        loss = criterion(model(x), y)
        loss.backward()
        optimizer.step()
        total += loss.item()
    print(f"Epoch {epoch + 1}/{EPOCHS} loss: {total / len(train_dl):.4f}")

model.eval()
preds, labels = [], []
with torch.no_grad():
    for x, y in test_dl:
        preds += model(x.to(device)).argmax(1).cpu().tolist()
        labels += y.tolist()
print(classification_report(labels, preds, target_names=train_ds.classes))
torch.save(model.state_dict(), "resnet50_baseline.pt")
