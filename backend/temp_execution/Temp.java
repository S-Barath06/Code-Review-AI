public class Temp {
   public static void main(String[] args) {
       int[][] matrix = {
           {1, 2, 3},
           {4, 5, 6},
           {7, 8, 9}
       };
       int rows = matrix.length;
       int cols = matrix[0].length;
       // Create a new matrix for the transpose
       int[][] transpose = new int[cols][rows];
       // Transpose logic
       for (int i = 0; i < rows; i++) {
           for (int j = 0; j < cols; j++) {
               transpose[j][i] = matrix[i][j];
           }
       }
       // Display the transposed matrix
       System.out.println("Transposed Matrix:");
       for (int[] row : transpose) {
           for (int val : row) {
               System.out.print(val + " ");
           }
           System.out.println();
       }
   }
}