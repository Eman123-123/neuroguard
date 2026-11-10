"""MRI baseline training script (ResNet-50, 4 classes).

KNOWN LIMITATIONS - READ BEFORE TRUSTING ANY NUMBER THIS PRODUCES
* Kaggle-derived slice datasets (incl. the "Alzheimer's Dataset (4 class of Images)"
  this script targets) do not always document subject selection, so you cannot
  verify that slices of one person stay on one side of the split. Slice-level
  splitting is known to inflate accuracy (Yagis et al., Sci. Rep. 11:22544, 2021
  reports ~+30 points on OASIS). Prefer OASIS-1/OASIS-3/ADNI (after signing their
  DUAs) and split BY SUBJECT.
* Only 3 epochs, no validation split, no early stopping, the test set is used to
  report the final model (and is the only held-out data): use train/val/test.
* No external validation. Treat results as a software smoke test, not performance.
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
    transforms.Grayscale(num_output_channels=3),  # Convert grayscale MRI to 3 channels for ResNet
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

# Class weighting to address dataset imbalance (e.g. Moderate class is smaller)
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
