---
title: "Convolutional networks"
description: "Why a fully connected layer wastes its weights on images; the convolution as one small filter slid across a grid, with kernels, stride, padding and channels; translation equivariance, pooling and invariance; receptive fields; the line from the neocognitron to residual networks; convolutions in one, two and three dimensions for spectra, micrographs and voxel grids; and how graph networks carry the idea over to atoms."
hook: "Connect every pixel of a one-megapixel micrograph to a thousand neurons and you need a billion weights. A convolutional layer that finds edges anywhere in the same image needs nine."
objectives:
  - "Count the weights a fully connected layer and a convolutional layer need for one image"
  - "Compute the output size and receptive field of a stack of convolutional layers"
  - "Implement a 2D convolution in NumPy and use it to detect edges"
  - "Explain translation equivariance, and how pooling turns it into approximate invariance"
  - "Choose 1D, 2D or 3D convolutions for spectra, micrographs and voxel grids"
track: arch
weight: 1
level: Core
minutes: 50
lab: "Find the edges of a particle with a hand-written convolution"
prereqs: ["neural-networks"]
---

## Why not a fully connected layer?

The networks of [the previous part](../neural-networks/) are built from fully connected layers, in which every neuron reads every input. That works for a few dozen descriptors and is hopeless for images. A scanning electron micrograph of 1,024 × 1,024 pixels is a vector of 1,048,576 grey levels, and one fully connected layer that maps it to 1,000 hidden neurons needs 1,048,576,000 weights: about a billion numbers, 4.2 GB in 32-bit floating point, before training has started.

The cost is the smaller problem. A fully connected layer has no idea that pixel (200, 300) sits next to pixel (200, 301): shuffle the pixels of every image in the same fixed way and it learns exactly as well. And a grain boundary in the top left of one micrograph and in the bottom right of another activates entirely different weights, so the network must learn what a grain boundary looks like separately at each of a million positions.

Images have two kinds of structure that a better architecture can build in.

1. **Locality.** What matters for interpreting a point is mostly nearby. An edge, a pore or a precipitate is defined by a small neighbourhood of pixels.
2. **Stationarity.** The same local pattern means the same thing wherever it appears.

Locality says that each neuron should read only a small patch; stationarity says that every patch should be read with the same weights. Together they define the convolutional layer.

## The convolution operation

A convolutional layer slides a small grid of weights, the **kernel** or **filter**, across the image. At each position it multiplies the kernel element by element with the patch underneath and adds up the products, giving one number of the output. The output is itself an image, called a **feature map**, whose value at each position says how strongly the patch there resembles the pattern stored in the kernel.

{{< eq title="Discrete 2D convolution" say="Each output pixel is a weighted sum of the input patch under the kernel, with the same weights at every position." >}}
$$ \textcolor{#f08c2e}{Y}_{ij} = \textcolor{#845ef7}{b} + \sum_{a=0}^{k-1}\sum_{c=0}^{k-1} \textcolor{#12a594}{K}_{ac}\,\textcolor{#4c6ef5}{X}_{i+a,\,j+c} $$
- $\textcolor{#4c6ef5}{X}$: the input image or feature map
- $\textcolor{#12a594}{K}$: the $k \times k$ kernel, shared by every position
- $\textcolor{#845ef7}{b}$: one bias for the whole feature map
- $\textcolor{#f08c2e}{Y}$: the output feature map
{{< /eq >}}

Strictly, this is a **cross-correlation**: the convolution of signal processing flips the kernel first, reading $X_{i-a,\,j-c}$. Deep-learning libraries use the unflipped form and call it convolution anyway, and since the kernel is learned, the distinction never matters.

A worked example makes the operation concrete. The **Sobel kernel**

$$
K = \begin{pmatrix} -1 & 0 & 1\\ -2 & 0 & 2\\ -1 & 0 & 1 \end{pmatrix}
$$

subtracts the left column of a patch from its right column, counting the middle row twice. Over a patch whose left two columns are dark (0) and whose right column is bright (1) it gives $1 + 2 + 1 = 4$; over a uniform patch the weights cancel to 0. It is a **vertical-edge detector**, positive for dark to bright and negative for bright to dark.

A convolutional network does not use hand-made kernels: it starts from random ones and learns them by [backpropagation](../backpropagation/). Yet the first-layer kernels of networks trained on photographs reliably turn into oriented edge detectors and colour blobs; the 2012 AlexNet paper displays all 96 of its first-layer kernels, and many are edge detectors at various orientations, cousins of the Sobel kernel.

{{< py title="a 2D convolution that finds edges" >}}
import numpy as np

def conv2d(X, K):
    """'Valid' 2D convolution (cross-correlation, as in deep-learning libraries)."""
    k = K.shape[0]
    out = np.zeros((X.shape[0] - k + 1, X.shape[1] - k + 1))
    for i in range(out.shape[0]):
        for j in range(out.shape[1]):
            out[i, j] = np.sum(K * X[i:i + k, j:j + k])   # one dot product per position
    return out

img = np.zeros((7, 8))
img[2:5, 2:5] = 1.0                       # a bright 3x3 particle on a dark background
sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])   # responds to left-right changes
edges = conv2d(img, sobel_x)
print("image:\n", img.astype(int))
print("response to the vertical-edge kernel:\n", edges.astype(int))

shifted = np.roll(img, 1, axis=1)         # move the particle one pixel to the right
edges_s = conv2d(shifted, sobel_x)
print("equivariant (the response moves with it):", np.array_equal(edges_s[:, 1:], edges[:, :-1]))
print("max |response|, before and after the shift:", np.abs(edges).max(), np.abs(edges_s).max())
{{< /py >}}

The synthetic "micrograph" is a bright square particle on a dark background. The response is positive along its left edge (4 opposite the middle row, falling to 3 and 1 towards the corners), equally negative along its right edge, and zero elsewhere; the top and bottom edges are invisible to this kernel. Shift the particle one pixel to the right and the response shifts with it, while its maximum stays at 4: the subject of the section after next.

{{< note type="try" >}}
Replace `sobel_x` with `sobel_x.T` to find the top and bottom edges. Try the blurring kernel `np.ones((3, 3)) / 9`, and move the particle to the border to see what a convolution without padding loses.
{{< /note >}}

### Stride, padding and output size

Three settings fix the geometry. The **kernel size** $k$ is almost always odd, and 3 × 3 is by far the most common today. The **stride** $s$ is how far the kernel moves between positions; a stride of 2 halves the width and height of the output. The **padding** $p$ adds zeros around the border, so that the kernel can also be centred on edge pixels.

{{< eq title="Output size of a convolution" say="Count how many times the kernel fits as it steps across the padded input." >}}
$$ \textcolor{#f08c2e}{n_{\text{out}}} = \left\lfloor \frac{\textcolor{#4c6ef5}{n} + 2\textcolor{#845ef7}{p} - \textcolor{#12a594}{k}}{\textcolor{#e64980}{s}} \right\rfloor + 1 $$
- $\textcolor{#4c6ef5}{n}$: input width (or height) in pixels
- $\textcolor{#845ef7}{p}$: zeros added on each side
- $\textcolor{#12a594}{k}$: kernel width
- $\textcolor{#e64980}{s}$: stride
{{< /eq >}}

In the cell above, 8 columns with $k = 3$, $p = 0$ and $s = 1$ give 6, and 7 rows give 5. The first layer of ResNet applies 7 × 7 kernels with stride 2 and padding 3 to a 224 × 224 image: $\lfloor 223/2 \rfloor + 1 = 112$. For stride 1 and odd $k$, padding $p = (k-1)/2$ keeps the size unchanged, which is why 3 × 3 kernels nearly always come with $p = 1$.

### Channels

Real inputs carry several numbers per pixel: three colour channels in a photograph, or one per element in an energy-dispersive X-ray map. A layer also uses many kernels, each producing its own feature map, and each kernel spans every input channel.

{{< eq title="A convolutional layer with channels" say="Each output channel adds up one small convolution per input channel, plus its own bias." >}}
$$ \textcolor{#f08c2e}{Y}_{o,\,ij} = \textcolor{#845ef7}{b}_o + \sum_{c=1}^{C_{\text{in}}}\sum_{a,\,a'} \textcolor{#12a594}{K}_{o c a a'}\,\textcolor{#4c6ef5}{X}_{c,\,i+a,\,j+a'}, \qquad \#\text{parameters} = k^2\,\textcolor{#4c6ef5}{C_{\text{in}}}\,\textcolor{#f08c2e}{C_{\text{out}}} + \textcolor{#f08c2e}{C_{\text{out}}} $$
- $\textcolor{#4c6ef5}{C_{\text{in}}}$: number of input channels
- $\textcolor{#f08c2e}{C_{\text{out}}}$: number of kernels, and so of output channels
- $\textcolor{#12a594}{K}$: a stack of $C_{\text{out}}$ kernels, each of size $C_{\text{in}} \times k \times k$
{{< /eq >}}

A 3 × 3 layer that takes 64 channels to 128 has 73,728 weights and 128 biases, whether the image is 32 × 32 or 4,000 × 4,000 pixels; set that against the billion weights above. A **1 × 1 convolution** looks at no neighbours: it mixes channels at each pixel, a cheap way to change their number (Lin, Chen and Yan, 2014).

## Equivariance, invariance and pooling

Because the same kernel is used at every position, shifting the input simply shifts the output. This is **translation equivariance**, and the cell above confirmed it.

{{< eq title="Translation equivariance" say="Shifting and then convolving gives the same result as convolving and then shifting." >}}
$$ \textcolor{#12a594}{K} \star \big(\textcolor{#e64980}{T_{\mathbf u}}\,\textcolor{#4c6ef5}{X}\big) = \textcolor{#e64980}{T_{\mathbf u}}\,\big(\textcolor{#12a594}{K} \star \textcolor{#4c6ef5}{X}\big) $$
- $\textcolor{#e64980}{T_{\mathbf u}}$: shift an image by the whole-pixel vector $\mathbf u$
- $\star$: the convolution of the previous section
{{< /eq >}}

Equivariance is what you want when the answer is itself a map: segmenting a micrograph into phases, or marking every atomic column in an electron-microscope image. When the answer is one statement about the whole image ("this micrograph contains a crack"), you want **invariance**: the output should not change when the input shifts.

**Pooling** turns the one into the other. **Max pooling** replaces each 2 × 2 block of a feature map by its largest value, halving width and height; a feature that moves by one pixel often stays inside the same block, so pooling buys tolerance to small shifts and makes later layers cheaper. At the end of the network, **global pooling** collapses each feature map to one number, which answers "is this feature present anywhere?" without saying where. The last line of the cell is a global max pool: 4 before the shift and after it.

Two caveats. The built-in symmetry is translation only: a convolutional network does not know that a rotated grain is still a grain. Rotations must be learned by **augmentation** (training on rotated and flipped copies) or built in, as in the group-equivariant networks of Cohen and Welling (2016). And strides break exact equivariance, since a one-pixel shift becomes a half-pixel shift after a stride-2 layer: Zhang (2019) showed that standard classifiers can change their answer when the input moves by one pixel, and that blurring before downsampling largely cures it.

## Receptive fields

A neuron in the first layer of a 3 × 3 network sees a 3 × 3 patch of the image: its **receptive field**. A second-layer neuron sees a 3 × 3 patch of first-layer neurons, and so 5 × 5 pixels; $L$ layers of $k \times k$ kernels at stride 1 see $1 + L(k-1)$ pixels across. Strides and pooling make the field grow faster, because each later step spans several input pixels.

{{< eq title="Receptive field of a stack of layers" say="Each layer widens the field by its kernel size minus one, measured in units of the stride accumulated so far." >}}
$$ \textcolor{#f08c2e}{r_l} = \textcolor{#f08c2e}{r_{l-1}} + (\textcolor{#12a594}{k_l} - 1)\,\textcolor{#845ef7}{j_{l-1}}, \qquad \textcolor{#845ef7}{j_l} = \textcolor{#845ef7}{j_{l-1}}\,\textcolor{#e64980}{s_l}, \qquad r_0 = j_0 = 1 $$
- $\textcolor{#f08c2e}{r_l}$: receptive-field width after layer $l$, in input pixels
- $\textcolor{#12a594}{k_l}$, $\textcolor{#e64980}{s_l}$: kernel size and stride of layer $l$ (a 2 × 2 pooling layer has $k = s = 2$)
- $\textcolor{#845ef7}{j_l}$: spacing, in input pixels, between neighbouring neurons of layer $l$
{{< /eq >}}

For three 3 × 3 convolutions with a 2 × 2 max-pool after each of the first two, the field grows as 3, 4, 8, 10 and 18 pixels. Without the pooling, the same three convolutions see only 7 × 7.

That carries a design lesson. Three stacked 3 × 3 layers see as far as one 7 × 7 layer, with $27C^2$ weights instead of $49C^2$ for $C$ channels, and three nonlinearities instead of one. Simonyan and Zisserman (2015) built their VGG networks on this observation, and modern networks are made almost entirely of 3 × 3 kernels.

The receptive field must cover whatever decides the answer: to judge grain size, it must span several grains. Luo et al. (2016) showed that the pixels near the centre dominate, so the **effective receptive field** is roughly Gaussian and smaller than the theoretical one; make the theoretical field comfortably larger than the largest structure that matters. Graph networks face the same question with bonds in place of pixels ([graph neural networks](../graph-neural-networks/)).

## From the visual cortex to residual networks

In experiments published in 1959 and 1962, David Hubel and Torsten Wiesel found that single neurons in a cat's visual cortex respond only to stimuli in a small region of the visual field, their receptive field, and prefer edges at a particular orientation; "complex cells" respond to the same edge over a wider region, whatever its exact position. The work shared the 1981 Nobel Prize in Physiology or Medicine.

Kunihiko Fukushima's **neocognitron** (1980) turned that picture into a machine, alternating layers that detect a feature with the same weights at every position with layers that pool over neighbouring positions: convolution and pooling in all but name. It learned by unsupervised self-organisation, not gradient descent. At Bell Labs, Yann LeCun and colleagues (1989) trained a convolutional network end to end with backpropagation to read handwritten zip codes, and LeNet-5 (LeCun, Bottou, Bengio and Haffner, 1998) went into a commercial system that, the paper reports, read several million cheques per day.

In 2012 Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton entered **AlexNet** in the ImageNet challenge (1.2 million training images, 1,000 classes). Its top-5 error was 15.3 per cent against 26.2 per cent for the runner-up, with ReLU activations, dropout, 60 million parameters and two consumer graphics cards. Deeper networks followed, but plain stacks of many layers trained *worse*: their training error went up. Kaiming He and colleagues (2016) fixed this with **residual connections**, $\mathbf h^{(l+1)} = \mathbf h^{(l)} + F(\mathbf h^{(l)})$, so that each block learns a correction to its input; their 152-layer ResNet won the 2015 challenge with 3.57 per cent top-5 error. The residual connection is now in every transformer block and most graph networks.

{{< note type="fun" >}}
The 1998 LeNet paper also introduced something it called **graph transformer networks**, for training a whole document-reading pipeline end to end. It has nothing to do with either graph neural networks or transformers, the next two chapters; the names are pure coincidence.
{{< /note >}}

## Convolutions for materials data: 1D, 2D and 3D

Nothing in the convolution requires two dimensions: the kernel slides along whichever axes the data are sampled on a regular grid.

**1D: spectra and diffraction patterns.** A powder X-ray diffraction pattern measured from 5° to 95° in steps of 0.02° is a vector of 4,500 intensities. A 1D kernel learns peak shapes, shoulders and splittings, and pooling tolerates small peak shifts. The tolerance has to be local, because differentiating Bragg's law, $\lambda = 2d\sin\theta$, shows that a uniform strain $\varepsilon$ moves each peak by $\Delta(2\theta) = -2\varepsilon\tan\theta$, more at high angle than at low. Park et al. (2017) classified crystal systems and space groups from simulated powder patterns this way, and Oviedo et al. (2019) classified small experimental thin-film datasets by augmenting them with plausible peak shifts and intensity changes. Raman, infrared and absorption spectra are handled the same way.

**2D: micrographs and maps.** Micrographs are the natural home of 2D networks: segmenting phases, grains and pores, finding cracks, locating atomic columns. The workhorse is the **U-Net** of Ronneberger, Fischer and Brox (2015): an encoder downsamples for context, a decoder upsamples back to full resolution, and skip connections carry fine detail across. It was designed for biomedical images with few labelled examples, a situation most microscopy groups know well. Maps also come from simulation: in my own work on polymer adhesion, a 2D convolutional encoder reads a surface patterned with strongly and weakly attracting sites ([research](../../research/)).

**3D: voxel grids.** Computed tomography of electrodes, electron densities on DFT grids and voxelised molecules are 3D arrays; AtomNet (Wallach, Dzamba and Heifets, 2015) applied 3D networks to protein–ligand complexes. Costs climb steeply: a 256³ volume holds 16.8 million voxels. For atoms there is a deeper problem: rotate a molecule and its voxel grid changes, so the network must learn every orientation from augmentation.

{{< note type="warn" title="Tiles from one image on both sides of the split" >}}
Small microscopy datasets are often enlarged by cutting each micrograph into hundreds of tiles. Split those tiles at random into training and test sets and neighbouring, nearly identical tiles land on both sides: the test score then measures memory, not generalisation. Split by micrograph, sample or batch instead ([generalisation](../generalisation/)).
{{< /note >}}

{{< note type="practice" >}}
A sound starting recipe: 3 × 3 kernels with padding 1; batch normalisation (Ioffe and Szegedy, 2015) and ReLU after each convolution; channels doubled whenever resolution halves; global average pooling before the output. Augment with flips and 90° rotations only when orientation carries no meaning (not, say, for a rolled sheet). With a few hundred labelled images, start from a network pretrained on ImageNet. In PyTorch: `torch.nn.Conv1d`, `Conv2d`, `Conv3d`.
{{< /note >}}

## From grids to graphs

Look again at the convolution with a graph network in mind. Each pixel collects the values of its eight neighbours and itself, multiplies each by a weight chosen by the neighbour's **offset** (up-left, up, up-right, …), and adds them up. That is message passing on a grid, with a lookup table of nine weights as the message function.

Atoms do not sit on a grid. The number of neighbours varies, the offsets are continuous 3D vectors, and "up-left" means nothing, because a rotated molecule is the same molecule. Graph networks keep the two principles that made convolution work, locality and weight sharing, and change the rest: they sum over whatever neighbours lie within a cut-off, and replace the lookup table by a smooth learned function of the distance (and, in equivariant networks, the direction). SchNet calls its messages "continuous-filter convolutions", and the crystal graph convolutional neural network (CGCNN) of Xie and Grossman (2018) carries the word in its name. The [next chapter](../graph-neural-networks/) builds these networks step by step; the one after, on [transformers](../transformers/), drops locality too, and vision transformers (Dosovitskiy et al., 2021) now rival convolutional networks on images given enough data.

{{< note type="key" >}}
- A convolutional layer applies one small kernel at every position of a grid: locality plus weight sharing.
- Its parameter count, $k^2 C_{\text{in}} C_{\text{out}} + C_{\text{out}}$, does not depend on the image size.
- Convolution is translation-equivariant; pooling makes the output approximately invariant.
- The receptive field grows by $k - 1$ times the accumulated stride per layer; stacked 3 × 3 kernels see far cheaply.
- 1D, 2D and 3D convolutions suit spectra, micrographs and voxel grids; graph networks carry the idea to atoms.
{{< /note >}}

{{< quiz >}}
- q: "A 64 × 64 micrograph passes through a 5 × 5 convolution with stride 1 and no padding. What size is the output?"
  options: ["64 × 64", "60 × 60", "59 × 59"]
  answer: 1
  why: "(n + 2p − k)/s + 1 = (64 − 5)/1 + 1 = 60. Padding of 2 on each side would keep it at 64 × 64."
- q: "How many parameters does a 3 × 3 convolutional layer with 32 input channels and 64 output channels have?"
  options: ["18,496", "576", "It depends on the size of the image"]
  answer: 0
  why: "64 kernels of 3 × 3 × 32 = 288 weights make 18,432, plus 64 biases: 18,496, for any image size."
- q: "A particle in a micrograph moves three pixels to the right. What happens to the feature map of a convolutional layer with stride 1?"
  options: ["It is unchanged, because convolution is translation-invariant", "It moves three pixels to the right, because convolution is translation-equivariant", "It changes unpredictably, because different weights now see the particle"]
  answer: 1
  why: "The same kernel acts at every position, so the output shifts with the input. Invariance needs pooling."
- q: "What is the receptive field of a neuron after four 3 × 3 convolutional layers with stride 1 and no pooling?"
  options: ["9 × 9", "12 × 12", "81 × 81"]
  answer: 0
  why: "Each 3 × 3 layer adds k − 1 = 2 pixels, so four layers see 1 + 4 × 2 = 9 pixels across."
- q: "Why does a 3D convolutional network trained on voxelised molecules usually need training data in many random orientations?"
  options: ["3D convolutions are not translation-equivariant", "Voxel grids cannot store more than one element", "Rotating a molecule changes its voxel grid, and convolution has no built-in rotational symmetry"]
  answer: 2
  why: "Convolutions are equivariant to shifts, not rotations. Graph networks avoid the problem by working with distances and directions."
{{< /quiz >}}

## References and further reading

<div class="refs">

1. I. Goodfellow, Y. Bengio and A. Courville, *Deep Learning*, MIT Press (2016), chapter 9 (convolutional networks).
2. V. Dumoulin and F. Visin, “A guide to convolution arithmetic for deep learning,” arXiv:1603.07285 (2016).
3. D. H. Hubel and T. N. Wiesel, “Receptive fields, binocular interaction and functional architecture in the cat's visual cortex,” *Journal of Physiology* **160**, 106–154 (1962).
4. K. Fukushima, “Neocognitron: a self-organizing neural network model for a mechanism of pattern recognition unaffected by shift in position,” *Biological Cybernetics* **36**, 193–202 (1980).
5. Y. LeCun, B. Boser, J. S. Denker, D. Henderson, R. E. Howard, W. Hubbard and L. D. Jackel, “Backpropagation applied to handwritten zip code recognition,” *Neural Computation* **1**, 541–551 (1989).
6. Y. LeCun, L. Bottou, Y. Bengio and P. Haffner, “Gradient-based learning applied to document recognition,” *Proceedings of the IEEE* **86**, 2278–2324 (1998).
7. A. Krizhevsky, I. Sutskever and G. E. Hinton, “ImageNet classification with deep convolutional neural networks,” *Advances in Neural Information Processing Systems* **25**, 1097–1105 (2012).
8. K. Simonyan and A. Zisserman, “Very deep convolutional networks for large-scale image recognition,” *International Conference on Learning Representations* (2015).
9. K. He, X. Zhang, S. Ren and J. Sun, “Deep residual learning for image recognition,” *Proceedings of CVPR*, 770–778 (2016).
10. M. Lin, Q. Chen and S. Yan, “Network in network,” *International Conference on Learning Representations* (2014).
11. S. Ioffe and C. Szegedy, “Batch normalization: accelerating deep network training by reducing internal covariate shift,” *Proceedings of ICML*, 448–456 (2015).
12. W. Luo, Y. Li, R. Urtasun and R. Zemel, “Understanding the effective receptive field in deep convolutional neural networks,” *Advances in Neural Information Processing Systems* **29** (2016).
13. T. S. Cohen and M. Welling, “Group equivariant convolutional networks,” *Proceedings of ICML* (2016).
14. R. Zhang, “Making convolutional networks shift-invariant again,” *Proceedings of ICML* (2019).
15. O. Ronneberger, P. Fischer and T. Brox, “U-Net: convolutional networks for biomedical image segmentation,” *Medical Image Computing and Computer-Assisted Intervention (MICCAI)*, Lecture Notes in Computer Science **9351**, 234–241 (2015).
16. W. B. Park et al., “Classification of crystal structure using a convolutional neural network,” *IUCrJ* **4**, 486–494 (2017).
17. F. Oviedo et al., “Fast and interpretable classification of small X-ray diffraction datasets using data augmentation and deep neural networks,” *npj Computational Materials* **5**, 60 (2019).
18. I. Wallach, M. Dzamba and A. Heifets, “AtomNet: a deep convolutional neural network for bioactivity prediction in structure-based drug discovery,” arXiv:1510.02855 (2015).
19. T. Xie and J. C. Grossman, “Crystal graph convolutional neural networks for an accurate and interpretable prediction of material properties,” *Physical Review Letters* **120**, 145301 (2018).
20. A. Dosovitskiy et al., “An image is worth 16x16 words: transformers for image recognition at scale,” *International Conference on Learning Representations* (2021).

</div>
